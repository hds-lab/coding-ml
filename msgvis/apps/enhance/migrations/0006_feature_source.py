# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0005_auto_20160128_0726'),
    ]

    operations = [
        migrations.AddField(
            model_name='feature',
            name='source',
            field=models.CharField(default=b'S', max_length=1, choices=[(b'S', b'System'), (b'U', b'User')]),
            preserve_default=True,
        ),
    ]
