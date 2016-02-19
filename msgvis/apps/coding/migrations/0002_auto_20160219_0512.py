# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('corpus', '0002_message_has_golden_code'),
        ('coding', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CodeDefinition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('definition', models.TextField(default=b'', null=True, blank=True)),
                ('code', models.ForeignKey(related_name='definitions', to='corpus.Code')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='CodeDefinitionExample',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('definition', models.ForeignKey(related_name='definition_examples', to='coding.CodeDefinition')),
                ('example', models.ForeignKey(related_name='definition_examples', to='corpus.Message')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='codedefinition',
            name='examples',
            field=models.ManyToManyField(related_name='definitions', through='coding.CodeDefinitionExample', to='corpus.Message'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='codedefinition',
            name='source',
            field=models.ForeignKey(related_name='definitions', to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
    ]
