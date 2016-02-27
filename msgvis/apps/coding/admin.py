from django.contrib import admin

# Register your models here.
from msgvis.apps.coding import models
admin.site.register(models.CodeAssignment)
admin.site.register(models.CodeDefinition)
admin.site.register(models.DisagreementIndicator)
