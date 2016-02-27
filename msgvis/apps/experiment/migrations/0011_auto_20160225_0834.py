# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0010_auto_20160225_0445'),
    ]

    operations = [
        migrations.AlterField(
            model_name='progress',
            name='user',
            field=models.OneToOneField(related_name='progress', to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
    ]
