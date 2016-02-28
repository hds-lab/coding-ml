from django.core.management.base import BaseCommand, make_option, CommandError
from time import time
import path
from django.db import transaction
import csv
import codecs
from operator import itemgetter

import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Live."
    args = '<dictionary_id>'
    option_list = BaseCommand.option_list + (
    #    make_option('-a', '--action',
    #                default='all',
    #                dest='action',
    #                help='Action to run [all|similarity]'
    #    ),

    )

    def handle(self, dictionary_id, **options):

        if not dictionary_id:
            raise CommandError("Dataset id is required.")
        try:
            dictionary_id = int(dictionary_id)
        except ValueError:
            raise CommandError("Dataset id must be a number.")

        action = options.get('action')

        from msgvis.apps.enhance.models import Dictionary
        dictionary = Dictionary.objects.get(id=dictionary_id)

        import pdb
        pdb.set_trace()