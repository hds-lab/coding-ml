# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('experiment', '0018_auto_20160310_0814'),
    ]

    operations = [
        migrations.AddField(
            model_name='experiment',
            name='isControlled',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='experiment',
            name='users',
            field=models.ManyToManyField(related_name='experiment', to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
    ]
