# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0016_actionhistory'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionhistory',
            name='stage_index',
            field=models.IntegerField(default=-1),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='actionhistory',
            name='status',
            field=models.CharField(default=None, max_length=1, null=True, choices=[(b'N', b'Not yet start'), (b'I', b'Initialization'), (b'C', b'Coding'), (b'W', b'Waiting'), (b'R', b'Review'), (b'S', b'Switching stage'), (b'F', b'Finished')]),
            preserve_default=True,
        ),
    ]
