from rest_framework import serializers
from .models import LineItem, Transaction, Match

class LineItemSerializer(serializers.ModelSerializer):
    amount_remaining = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    
    class Meta:
        model = LineItem
        fields = [
            'id', 'investor_entity', 'expected_reference', 
            'amount_called', 'amount_funded', 'amount_remaining', 'status'
        ]

class MatchSerializer(serializers.ModelSerializer):
    line_item = LineItemSerializer(read_only=True)
    
    class Meta:
        model = Match
        fields = ['id', 'line_item', 'status', 'reason']

class TransactionSerializer(serializers.ModelSerializer):
    matches = MatchSerializer(source='match_set', many=True, read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'description', 'amount', 'type', 
            'bank_reference', 'status', 'reason', 'matches'
        ]