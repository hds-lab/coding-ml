# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('experiment', '0019_auto_20160816_0533'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserExperimentConnect',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('experiment', models.ForeignKey(related_name='user_connections', to='experiment.Experiment')),
                ('user', models.OneToOneField(related_name='experiment_connection', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
