import re
import csv
import io
from django.db.models import F
from datetime import datetime
from decimal import Decimal, InvalidOperation
from .models import LineItem, Match, Transaction

def normalize_name(name):
    """
    Uppercase, replace non-alphanumeric with space, collapse spaces.
    Drop trailing LLC, LP, LTD, or INC.
    """
    name = name.upper()
    name = re.sub(r'[^A-Z0-9]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    name = re.sub(r'\s+(LLC|LP|LTD|INC)$', '', name).strip()
    return name

def generate_matches_for_transaction(transaction):
    
    #Ignore non-credit transactions
    if transaction.type != 'credit':
        return

    #Reference Normalisation
    clean_bank_ref = re.sub(r'[^A-Z0-9]', '', transaction.bank_reference.upper())
    clean_desc_ref = re.sub(r'[^A-Z0-9]', '', transaction.description.upper())

    #Name Normalisation
    clean_desc_name = re.sub(r'[^A-Z0-9]', ' ', transaction.description.upper())
    clean_desc_name = re.sub(r'\s+', ' ', clean_desc_name).strip()

    #Eligible line items
    open_line_items = LineItem.objects.filter(
        organization=transaction.organization,
        amount_funded__lt=F('amount_called'),
        capital_call__call_date__lte=transaction.date
    )

    #Reference check
    ref_matches = []
    for li in open_line_items:
        clean_line_item_expected_reference = re.sub(
            r'[^A-Z0-9]',
            '',
            li.expected_reference.upper()
            )
        if clean_line_item_expected_reference in clean_bank_ref or clean_line_item_expected_reference in clean_desc_ref:
            ref_matches.append(li)

    if ref_matches:
        if len(ref_matches) == 1:
            li = ref_matches[0]
            if transaction.amount <= li.amount_remaining:
                Match.objects.create(transaction=transaction, line_item=li, reason="Reference match", status='proposed')
                transaction.status = 'suggested'
                transaction.reason = "Clear reference match."
            else:
                transaction.status = 'needs_review'
                transaction.reason = f"Overpayment: Reference found but {transaction.amount} exceeds remaining {li.amount_remaining}."
        else:
            Match.objects.bulk_create([
                Match(transaction=transaction, line_item=li, reason="Multiple reference matches", status='proposed')
                for li in ref_matches
            ])
            transaction.status = 'suggested'
            transaction.reason = "Multiple references found."
        
        transaction.save(update_fields=['status', 'reason'])
        return

    #Name and Amount check
    name_matches = []
    for li in open_line_items:
        if transaction.amount == li.amount_remaining:
            norm_investor = normalize_name(li.investor_entity)
            pattern = r'\b' + re.escape(norm_investor) + r'\b'
            if re.search(pattern, clean_desc_name):
                name_matches.append(li)

    if len(name_matches) == 1:
        Match.objects.create(transaction=transaction, line_item=name_matches[0], reason="Name and exact amount match", status='proposed')
        transaction.status = 'suggested'
        transaction.reason = "Name and exact amount match."
    elif len(name_matches) > 1:
        Match.objects.bulk_create([
            Match(transaction=transaction, line_item=li, reason="Multiple name matches", status='proposed')
            for li in name_matches
        ])
        transaction.status = 'suggested'
        transaction.reason = "Multiple name and amount matches found."
    else:
        transaction.status = 'needs_review'
        transaction.reason = "No matching reference or name/amount found."

    transaction.save(update_fields=['status', 'reason'])

def process_csv_upload(file_obj, organization):
    #Decode the file
    decoded_file = file_obj.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded_file))
    
    #Missing column rejection
    required_cols = {'date', 'description', 'amount', 'type', 'reference'}
    if not reader.fieldnames:
        return {"error": "Empty file or invalid CSV.", "status": 400}
        
    headers = {col.strip().lower() for col in reader.fieldnames if col}
    if not required_cols.issubset(headers):
        return {"error": "Missing required columns.", "status": 400}

    valid_rows = []
    errors = []
    duplicates_count = 0
    
    #Pre-fetch existing references
    existing_refs = set(Transaction.objects.filter(
        organization=organization
    ).values_list('bank_reference', flat=True))
    
    seen_refs_in_file = set()
    
    line_number = 1 
    
    for row in reader:
        line_number += 1
        
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        
        date_str = clean_row.get('date', '')
        normalized_date = date_str.replace('/', '-').replace('.', '-')
        desc_str = clean_row.get('description', '')
        amt_str = clean_row.get('amount', '')
        type_str = clean_row.get('type', '').lower()
        ref_str = clean_row.get('reference', '')
        
        #Validation checks
        if not desc_str:
            errors.append({"line": line_number, "message": "Description is required."})
            continue
        if not ref_str:
            errors.append({"line": line_number, "message": "Reference is required."})
            continue
            
        try:
            parsed_date = datetime.strptime(normalized_date, '%Y-%m-%d').date()
        except ValueError:
            errors.append({"line": line_number, "message": f"Invalid date format: {date_str}. Must be YYYY-MM-DD."})
            continue
            
        if type_str not in ('credit', 'debit'):
            errors.append({"line": line_number, "message": f"Invalid type: {type_str}. Must be credit or debit."})
            continue
            
        try:
            amount_val = Decimal(amt_str.replace(',', ''))
        except InvalidOperation:
            errors.append({"line": line_number, "message": f"Invalid amount: {amt_str}."})
            continue
            
        if amount_val == Decimal('0'):
            errors.append({"line": line_number, "message": "Amount cannot be zero."})
            continue
        
        if type_str != 'credit' and type_str != 'debit':
            errors.append({"line": line_number, "message": f"Invalid type: {type_str}. Must be credit or debit."})
            continue
            
        if type_str == 'credit' and amount_val <= 0:
            errors.append({"line": line_number, "message": "Credits must be positive."})
            continue
            
        if type_str == 'debit' and amount_val >= 0:
            errors.append({"line": line_number, "message": "Debits must be negative."})
            continue
            
        #Duplicate Reference Check
        if ref_str in existing_refs or ref_str in seen_refs_in_file:
            duplicates_count += 1
            errors.append({"line": line_number, "message": f"Duplicate reference: {ref_str}"})
            continue
            
        seen_refs_in_file.add(ref_str)
        
        status = 'ignored' if type_str == 'debit' else 'needs_review'
        reason = 'Debit transaction ignored.' if type_str == 'debit' else ''
        
        valid_rows.append(Transaction(
            organization=organization,
            date=parsed_date,
            description=desc_str,
            amount=amount_val,
            type=type_str,
            bank_reference=ref_str,
            status=status,
            reason=reason
        ))
    
    if valid_rows:
        created_txns = Transaction.objects.bulk_create(valid_rows)
        
        for txn in created_txns:
            if txn.type == 'credit':
                generate_matches_for_transaction(txn)
                
    return {
        "status": 200,
        "data": {
            "imported": len(valid_rows),
            "duplicates": duplicates_count,
            "errors": errors,
        }
    }
