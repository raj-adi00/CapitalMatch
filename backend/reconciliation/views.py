from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from django.db import transaction as db_transaction
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .serializers import LineItemSerializer, TransactionSerializer
from .services import process_csv_upload
from .models import Organization, LineItem, Transaction, Match

class TransactionUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded."}, status=400)
            
        org_slug = request.headers.get('X-Organization')
        if not org_slug:
            return Response({"error": "Missing X-Organization header."}, status=400)
            
        try:
            organization = Organization.objects.get(slug=org_slug)
        except Organization.DoesNotExist:
            return Response({"error": "Unknown organization."}, status=404)
            
        result = process_csv_upload(file_obj, organization)
        
        if result.get("status") == 200:
            return Response(result["data"], status=200)
        
        return Response({"error": result["error"]}, status=400)

class LineItemListView(generics.ListAPIView):
    serializer_class = LineItemSerializer

    def get_queryset(self):
        org_slug = self.request.headers.get('X-Organization')
        
        if not org_slug:
            raise ValidationError({"error": "Missing X-Organization header."}, status=400)
        
        organization = get_object_or_404(Organization,slug=org_slug)
        
        return LineItem.objects.filter(organization=organization)

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        org_slug = self.request.headers.get('X-Organization')
        
        if not org_slug:
            raise ValidationError({"error": "Missing X-Organization header."}, status=400)
        
        organization = get_object_or_404(Organization,slug=org_slug)
        
        return Transaction.objects.filter(
            organization=organization
        ).prefetch_related('match_set', 'match_set__line_item').order_by('-date', '-id')          

class ApproveMatchView(APIView):
    def post(self, request, match_id):
        org_slug = request.headers.get('X-Organization')
        
        if not org_slug:
            return Response({"error": "Missing X-Organization header."}, status=400)
        try:
            match = Match.objects.select_related('line_item', 'transaction').get(
                id=match_id,
                transaction__organization__slug=org_slug
            )
        except Match.DoesNotExist:
            return Response({"error": "Match not found."}, status=404)

        if match.transaction.status == 'reconciled':
            return Response({"error": "This transaction has already been reconciled."}, status=400)

        if match.transaction.amount > match.line_item.amount_remaining:
            return Response({
                "error": f"Cannot approve: Transaction amount ({match.transaction.amount}) exceeds the line item's remaining balance ({match.line_item.amount_remaining})."
            }, status=400)

        with db_transaction.atomic():
            #Update the line item funds
            match.line_item.amount_funded += match.transaction.amount
            match.line_item.save(update_fields=['amount_funded'])

            #Update the match status
            match.status = 'approved'
            match.save(update_fields=['status'])

            #Update the transaction status
            match.transaction.status = 'reconciled'
            match.transaction.reason = "Match approved manually."
            match.transaction.save(update_fields=['status', 'reason'])

            #Automatically reject any other proposed matches for this same transaction
            Match.objects.filter(
                transaction=match.transaction, 
                status='proposed'
            ).exclude(id=match.id).update(
                status='rejected', 
                reason="Another match was approved."
            )

        return Response({"message": "Match approved successfully.", "status": 200})

class RejectMatchView(APIView):
    def post(self, request, match_id):
        org_slug = request.headers.get('X-Organization')
        
        if not org_slug:
            return Response({"error": "Missing X-Organization header."}, status=400)
        try:
            match = Match.objects.select_related('transaction').get(
                id=match_id, 
                transaction__organization__slug=org_slug
            )
        except Match.DoesNotExist:
            return Response({"error": "Match not found."}, status=404)

        if match.status != 'proposed':
            return Response({"error": "Only proposed matches can be rejected."}, status=400)

        with db_transaction.atomic():
            #Mark this match as rejected
            match.status = 'rejected'
            match.save(update_fields=['status'])

            #If there are no other 'proposed' matches left for this transaction, 
            # we should revert the transaction status to 'needs_review'
            remaining_proposals = Match.objects.filter(
                transaction=match.transaction, 
                status='proposed'
            ).exists()
            
            if not remaining_proposals:
                match.transaction.status = 'needs_review'
                match.transaction.reason = "All suggested matches were rejected."
                match.transaction.save(update_fields=['status', 'reason'])

        return Response({"message": "Match rejected successfully.", "status": 200})
