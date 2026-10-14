from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .serializers import LineItemSerializer, TransactionSerializer
from .services import process_csv_upload
from .models import Organization, LineItem, Transaction

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
