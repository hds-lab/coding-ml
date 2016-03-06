# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0014_auto_20160306_0741'),
    ]

    operations = [
        migrations.AddField(
            model_name='progress',
            name='is_finished',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
    ]
