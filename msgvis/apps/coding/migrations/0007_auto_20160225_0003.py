# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('coding', '0006_auto_20160222_0230'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='svmmodel',
            name='source',
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
    ]
