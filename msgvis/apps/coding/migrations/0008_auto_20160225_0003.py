# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0005_auto_20160225_0003'),
        ('coding', '0007_auto_20160225_0003'),
    ]

    operations = [
        migrations.DeleteModel(
            name='SVMModel',
        ),
        migrations.DeleteModel(
            name='SVMModelWeight',
        ),
    ]
