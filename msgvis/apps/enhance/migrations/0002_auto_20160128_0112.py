# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0001_initial'),
    ]

    operations = [
        migrations.AlterIndexTogether(
            name='precalccategoricaldistribution',
            index_together=None,
        ),
        migrations.RemoveField(
            model_name='precalccategoricaldistribution',
            name='dataset',
        ),
        migrations.DeleteModel(
            name='PrecalcCategoricalDistribution',
        ),
    ]
