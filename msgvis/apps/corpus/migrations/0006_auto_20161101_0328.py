# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0005_comment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='comment',
            name='message',
        ),
        migrations.RemoveField(
            model_name='comment',
            name='source',
        ),
        migrations.DeleteModel(
            name='Comment',
        ),
    ]
