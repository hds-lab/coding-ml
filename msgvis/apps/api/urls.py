from django.conf.urls import url

from msgvis.apps.api import views
from django.views.decorators.csrf import csrf_exempt

api_root_urls = {

    'dataset': url(r'^dataset/$', csrf_exempt(views.DatasetView.as_view()), name='dataset'),
    'message': url(r'^message/(?P<message_id>[0-9]+)$', csrf_exempt(views.MessageView.as_view()), name='message'),
    'list_distribution': url(r'^list_distribution/(?P<dataset_id>[0-9]+)$', csrf_exempt(views.ListDistributionView.as_view()), name='list_distribution'),
    'dictionary': url(r'^dictionary/$', csrf_exempt(views.DictionaryView.as_view()), name='dictionary'),
    'svm': url(r'^svm/$', csrf_exempt(views.SVMResultView.as_view()), name='svm'),
    'vector': url(r'^vector/(?P<message_id>[0-9]+)$', csrf_exempt(views.FeatureVectorView.as_view()), name='vector'),
    'feature_list': url(r'^feature/$', csrf_exempt(views.UserFeatureView.as_view()), name='feature_list'),
    'feature': url(r'^feature/(?P<feature_id>[0-9]+)/$', csrf_exempt(views.UserFeatureView.as_view()), name='feature'),
    'comments': url(r'^comments/$', csrf_exempt(views.CommentView.as_view()), name='comments'),
    'distribution': url(r'^distribution/$', csrf_exempt(views.FeatureCodeDistributionView.as_view()), name='distribution'),
    'assignment': url(r'^assignment/(?P<message_id>[0-9]+)$', csrf_exempt(views.CodeAssignmentView.as_view()), name='assignment'),
    'definitions': url(r'^definition/$', csrf_exempt(views.CodeDefinitionView.as_view()), name='definitions'),
    #'definition': url(r'^definition/(?P<code_id>[0-9]+)$', csrf_exempt(views.CodeDefinitionView.as_view()), name='definition'),
    'code_messages': url(r'^code_messages/$', csrf_exempt(views.CodeMessageView.as_view()), name='code_messages'),
    'all_coded_messages': url(r'^all_coded_messages/$', csrf_exempt(views.AllCodedMessageView.as_view()), name='all_coded_messages'),
    'disagreement': url(r'^disagreement/(?P<message_id>[0-9]+)$', csrf_exempt(views.DisagreementIndicatorView.as_view()), name='disagreement'),
    'pairwise': url(r'^pairwise/$', csrf_exempt(views.PairwiseConfusionMatrixView.as_view()), name='pairwise'),
    'progress': url(r'^progress/$', csrf_exempt(views.ProgressView.as_view()), name='progress'),
    'exp_progress': url(r'^exp_progress/(?P<exp_id>[0-9]+)/$', csrf_exempt(views.ExperimentProgressView.as_view()), name='exp_progress'),
    'action-history': url(r'^history/$', views.ActionHistoryView.as_view(), name='action-history'),
    'partners': url(r'^partners/$', views.PartnerView.as_view(), name='partners'),

}

urlpatterns = api_root_urls.values() + [
    url(r'^$', views.APIRoot.as_view(root_urls=api_root_urls)),
]
