from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date
from reconciliation.models import Organization, CapitalCall, LineItem

class Command(BaseCommand):
    help = 'Seeds the database with initial demo data for CapitalMatch'

    def handle(self, *args, **kwargs):
        with transaction.atomic():
            #1. Organizations
            northwind, _ = Organization.objects.get_or_create(
                slug='northwind', defaults={'name': 'Northwind Ventures'}
            )
            bluebird, _ = Organization.objects.get_or_create(
                slug='bluebird', defaults={'name': 'Bluebird Capital'}
            )

            #2. Capital Calls
            nw_call_1, _ = CapitalCall.objects.get_or_create(
                organization=northwind,
                call_date=date(2026, 3, 25),
                due_date=date(2026, 4, 10)
            )
            nw_call_2, _ = CapitalCall.objects.get_or_create(
                organization=northwind,
                call_date=date(2026, 4, 1),
                due_date=date(2026, 4, 20)
            )
            bb_call_1, _ = CapitalCall.objects.get_or_create(
                organization=bluebird,
                call_date=date(2026, 4, 1),
                due_date=date(2026, 4, 15)
            )

            #3. Northwind Call #1
            self.create_line_item(nw_call_1, northwind, 'Haller Capital LLC', 'CC1001', '27500.00')
            self.create_line_item(nw_call_1, northwind, 'Rahul Shah Trust', 'CC1002', '25000.00')
            self.create_line_item(nw_call_1, northwind, 'Patel Family Trust', 'CC1003', '12500.00')
            self.create_line_item(nw_call_1, northwind, 'Meridian Partners LP', 'CC1004', '15000.00')
            self.create_line_item(nw_call_1, northwind, 'Oakridge Holdings LLC', 'CC1005', '15000.00')

            # Northwind Call #2
            self.create_line_item(nw_call_2, northwind, 'Oakridge Holdings LLC', 'CC1006', '15000.00')

            # Bluebird Call #1
            self.create_line_item(bb_call_1, bluebird, 'Cedar Grove Fund LP', 'CC2001', '40000.00')

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))

    def create_line_item(self, capital_call, org, entity, ref, amount):
        LineItem.objects.get_or_create(
            capital_call=capital_call,
            investor_entity=entity,
            defaults={
                'organization': org,
                'expected_reference': ref,
                'amount_called': Decimal(amount),
                'amount_funded': Decimal('0.00')
            }
        )
