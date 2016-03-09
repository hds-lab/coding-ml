# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('coding', '0010_auto_20160227_0138'),
    ]

    operations = [
        migrations.AddField(
            model_name='codeassignment',
            name='source_stage_index',
            field=models.IntegerField(default=-1, null=True),
            preserve_default=True,
        ),
    ]
