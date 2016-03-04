# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0004_auto_20160224_1002'),
        ('enhance', '0002_auto_20160222_0230'),
    ]

    operations = [
        migrations.AddField(
            model_name='feature',
            name='origin',
            field=models.ForeignKey(related_name='user_features', default=None, to='corpus.Message', null=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='feature',
            name='source',
            field=models.ForeignKey(related_name='features', default=None, to=settings.AUTH_USER_MODEL, null=True),
            preserve_default=True,
        ),
    ]
