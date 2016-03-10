from django.contrib import admin

# Register your models here.
from msgvis.apps.experiment import models
admin.site.register(models.Experiment)
admin.site.register(models.MessageSet)
admin.site.register(models.Condition)
admin.site.register(models.Assignment)
admin.site.register(models.StageAssignment)
admin.site.register(models.MessageSelection)
admin.site.register(models.Pair)
admin.site.register(models.Progress)
admin.site.register(models.SVMModel)
admin.site.register(models.SVMModelWeight)