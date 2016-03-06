# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0013_auto_20160227_0138'),
    ]

    operations = [
        migrations.AlterField(
            model_name='progress',
            name='current_status',
            field=models.CharField(default=b'N', max_length=1, choices=[(b'N', b'Not yet start'), (b'I', b'Initialization'), (b'C', b'Coding'), (b'W', b'Waiting'), (b'R', b'Review'), (b'S', b'Switching stage'), (b'F', b'Finished')]),
            preserve_default=True,
        ),
    ]
