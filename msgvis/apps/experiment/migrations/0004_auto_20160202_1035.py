# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0003_progress'),
    ]

    operations = [
        migrations.AlterField(
            model_name='progress',
            name='user',
            field=models.ForeignKey(related_name='progress', to=settings.AUTH_USER_MODEL, unique=True),
            preserve_default=True,
        ),
    ]
