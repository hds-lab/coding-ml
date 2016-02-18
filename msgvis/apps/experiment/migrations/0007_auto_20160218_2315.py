# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('coding', '0001_initial'),
        ('experiment', '0006_auto_20160203_1003'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='codeassignment',
            name='code',
        ),
        migrations.RemoveField(
            model_name='codeassignment',
            name='message',
        ),
        migrations.RemoveField(
            model_name='codeassignment',
            name='user',
        ),
        migrations.DeleteModel(
            name='CodeAssignment',
        ),
        migrations.RemoveField(
            model_name='featureassignment',
            name='feature',
        ),
        migrations.RemoveField(
            model_name='featureassignment',
            name='user',
        ),
        migrations.DeleteModel(
            name='FeatureAssignment',
        ),
        migrations.RemoveField(
            model_name='svmmodel',
            name='source_stage',
        ),
        migrations.RemoveField(
            model_name='svmmodel',
            name='user',
        ),
        migrations.RemoveField(
            model_name='svmmodelweight',
            name='code',
        ),
        migrations.RemoveField(
            model_name='svmmodelweight',
            name='feature',
        ),
        migrations.RemoveField(
            model_name='svmmodelweight',
            name='svm_model',
        ),
        migrations.DeleteModel(
            name='SVMModel',
        ),
        migrations.DeleteModel(
            name='SVMModelWeight',
        ),
        migrations.AddField(
            model_name='stage',
            name='feature_assignment',
            field=models.ManyToManyField(related_name='source_stage', to='coding.FeatureAssignment'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stage',
            name='svm_models',
            field=models.ManyToManyField(related_name='source_stage', to='coding.SVMModel'),
            preserve_default=True,
        ),
    ]
