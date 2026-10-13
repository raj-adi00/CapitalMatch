import re
from django.db.models import F
from .models import LineItem, Match

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
            transaction.status = 'needs_review'
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
        transaction.status = 'needs_review'
        transaction.reason = "Multiple name and amount matches found."
    else:
        transaction.status = 'needs_review'
        transaction.reason = "No matching reference or name/amount found."

    transaction.save(update_fields=['status', 'reason'])