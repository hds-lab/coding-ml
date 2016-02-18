from django.contrib import admin

# Register your models here.
from msgvis.apps.coding import models
admin.site.register(models.CodeAssignment)
admin.site.register(models.FeatureAssignment)
admin.site.register(models.SVMModel)
admin.site.register(models.SVMModelWeight)
