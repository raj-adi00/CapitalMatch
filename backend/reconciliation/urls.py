from django.urls import path
from .views import TransactionUploadView, LineItemListView, TransactionListView, ApproveMatchView, RejectMatchView, OrganizationListView

urlpatterns = [
    #Upload
    path('upload/', TransactionUploadView.as_view(), name='transaction-upload'),
    #Lists
    path('line-items/', LineItemListView.as_view(), name='line-item-list'),
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('organizations/', OrganizationListView.as_view(), name='organization-list'),
    #Actions
    path('matches/<int:match_id>/approve/', ApproveMatchView.as_view(), name='approve-match'),
    path('matches/<int:match_id>/reject/', RejectMatchView.as_view(), name='reject-match'),
]