from django.conf.urls import url

from msgvis.apps.api import views
from django.views.decorators.csrf import csrf_exempt

api_root_urls = {

    'dataset': url(r'^dataset/$', csrf_exempt(views.DatasetView.as_view()), name='dataset'),
    'dictionary': url(r'^dictionary/$', csrf_exempt(views.DictionaryView.as_view()), name='dictionary'),
    'svm': url(r'^svm/$', csrf_exempt(views.SVMResultView.as_view()), name='svm'),
    'vector': url(r'^vector/$', csrf_exempt(views.FeatureVectorView.as_view()), name='vector'),
}

urlpatterns = api_root_urls.values() + [
    url(r'^$', views.APIRoot.as_view(root_urls=api_root_urls)),
]
