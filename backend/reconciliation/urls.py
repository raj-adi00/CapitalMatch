from django.urls import path
from .views import TransactionUploadView, LineItemListView, TransactionListView

urlpatterns = [
    path('upload/', TransactionUploadView.as_view(), name='transaction-upload'),
    path('line-items/', LineItemListView.as_view(), name='line-item-list'),
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
]