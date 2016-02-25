# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0007_auto_20160225_0037'),
    ]

    operations = [
        migrations.AlterField(
            model_name='progress',
            name='status',
            field=models.CharField(default=b'I', max_length=1, choices=[(b'I', b'Initialization'), (b'C', b'Coding'), (b'W', b'Waiting'), (b'R', b'Review'), (b'S', b'Switching stage')]),
            preserve_default=True,
        ),
    ]
