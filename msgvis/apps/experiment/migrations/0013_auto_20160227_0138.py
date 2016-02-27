# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0012_auto_20160227_0138'),
    ]

    operations = [
        migrations.AlterField(
            model_name='svmmodel',
            name='source',
            field=models.ForeignKey(related_name='svm_models', to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='svmmodel',
            name='source_stage',
            field=models.ForeignKey(related_name='svm_models', to='experiment.StageAssignment'),
            preserve_default=True,
        ),
    ]
