from django.db import models
from decimal import Decimal

# Create your models here.
class Organization(models.Model):
    slug = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=255)
    
    def __str__(self):
        return self.name

class CapitalCall(models.Model):
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='capital_calls'
    )
    call_date = models.DateField()
    due_date = models.DateField()

class LineItem(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('partially_funded', 'Partially Funded'),
        ('funded', 'Funded'),
    ]
    
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='line_items'
    )
    capital_call = models.ForeignKey(
        CapitalCall, 
        on_delete=models.CASCADE, 
        related_name='line_items'
    )
    investor_entity = models.CharField(max_length=255)
    expected_reference = models.CharField(max_length=100)
    
    amount_called = models.DecimalField(max_digits=14, decimal_places=2)
    amount_funded = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    @property
    def amount_remaining(self):
        return self.amount_called - self.amount_funded
    
    @property
    def status(self):
        if self.amount_funded == Decimal('0.00'):
            return 'open'
        elif self.amount_funded >= self.amount_called:
            return 'funded'
        else:
            return 'partially_funded'

    class Meta:
        unique_together = ('capital_call', 'investor_entity')
    
class Transaction(models.Model):
    TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    STATUS_CHOICES = [
        ('suggested', 'Suggested'),
        ('needs_review', 'Needs Review'),
        ('reconciled', 'Reconciled'),
        ('ignored', 'Ignored'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    date = models.DateField()
    description = models.TextField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    bank_reference = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="needs_review")
    
    class Meta:
        unique_together = ('organization', 'bank_reference')
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(amount=0),
                name = 'amount_cannot_be_zero'
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(type='credit') & models.Q(amount__gt=0)) |
                    (models.Q(type='debit') & models.Q(amount__lt=0))
                ),
                name='valid_amount_signs'
            )
        ]

class Match(models.Model):
    STATUS_CHOICES = [
        ('proposed', 'Proposed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='matches')
    line_item = models.ForeignKey(LineItem, on_delete=models.CASCADE, related_name='matches')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="proposed")
