import traceback
import sys
import path
import csv
from time import time
from optparse import make_option

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from django.contrib.auth.models import User

from msgvis.apps.importer.models import create_an_instance_from_json
from msgvis.apps.corpus.models import Dataset, Code
from msgvis.apps.coding.models import CodeAssignment

class Command(BaseCommand):
    """
    Import a corpus of message data into the database.

    .. code-block :: bash

        $ python manage.py import_corpus <file_path>

    """
    args = '<dataset_id> <coded_data_file>[...]'
    help = "Import coded data"
    option_list = BaseCommand.option_list + (
        make_option('-u', '--user',
                    action='store',
                    dest='user',
                    default='master',
                    help='Set source user of the coded data'
        ),
    )

    def handle(self, dataset_id, *filenames, **options):

        if not dataset_id:
            raise CommandError("Dataset id is required.")
        try:
            dataset_id = int(dataset_id)
        except ValueError:
            raise CommandError("Dataset id must be a number.")

        if len(filenames) == 0:
            raise CommandError('At least one filename must be provided.')

        for f in filenames:
            if not path.path(f).exists():
                raise CommandError("Filename %s does not exist" % f)

        user = options.get('user')

        start = time()
        dataset_obj = Dataset.objects.get(id=dataset_id)
        user_obj = User.objects.get(username=user)


        for i, corpus_filename in enumerate(filenames):
            with open(corpus_filename, 'rb') as fp:
                if len(filenames) > 1:
                    print "Reading file %d of %d %s" % (i + 1, len(filenames), corpus_filename)
                else:
                    print "Reading file %s" % corpus_filename

                csvreader = csv.reader(fp, delimiter=',')
                importer = Importer(csvreader, dataset_obj, user_obj)
                importer.run()


        print "Time: %.2fs" % (time() - start)


class Importer(object):
    commit_every = 100
    print_every = 1000

    def __init__(self, csvreader, dataset, user):
        self.csvreader = csvreader
        self.dataset = dataset
        self.source = user

        self.line = 0
        self.imported = 0
        self.not_valid = 0
        self.errors = 0

        self.codes = []
        self.col_map = {}

        self._get_all_codes()
        self._build_col_map()

    def _get_all_codes(self):
        self.codes = list(Code.objects.all())


    def _import_group(self, rows):
        with transaction.atomic(savepoint=False):
            for cols in rows:

                if len(cols) > 0:
                    try:
                        message = self.create_an_instance_from_csv_cols(cols)
                        if message:
                            self.imported += 1
                        else:
                            self.not_valid += 1
                    except:
                        self.errors += 1
                        print >> sys.stderr, "Import error on line %d" % self.line
                        traceback.print_exc()

        #if settings.DEBUG:
            # prevent memory leaks
        #    from django.db import connection
        #    connection.queries = []

    def _build_col_map(self):
        header = self.csvreader.next()
        for i in range(len(header)):
            self.col_map[header[i]] = i
            self.col_map[i] = header[i]

    def _col_is_checked(self, cols, col_name):
        col_idx = self.col_map.get(col_name)
        return cols[col_idx] == "x"

    def create_an_instance_from_csv_cols(self, cols):
        try:
            message_ori_id = cols[self.col_map["id"]]
            is_ambiguous = self._col_is_checked(cols, "is_ambiguous")

            flag = False
            message = self.dataset.message_set.get(original_id=message_ori_id)
            for code in self.codes:
                if self._col_is_checked(cols, code.text):
                    code_assignments = CodeAssignment.objects.filter(message=message,
                                                                     source=self.source,
                                                                     code=code)
                    code_assignments.update(valid=False)

                    CodeAssignment.objects.create(message=message, source=self.source,
                                                  code=code, is_ambiguous=is_ambiguous)

                    flag = True

            return flag
        except:
            return False

    def run(self):
        transaction_group = []

        start = time()

        for cols in self.csvreader:
            self.line += 1

            transaction_group.append(cols)

            if len(transaction_group) >= self.commit_every:
                self._import_group(transaction_group)
                transaction_group = []

            if self.line > 0 and self.line % self.print_every == 0:
                print "%6.2fs | Reached line %d. Imported: %d; Not-valid: %d; Errors: %d" % (
                time() - start, self.line, self.imported, self.not_valid, self.errors)

        if len(transaction_group) >= 0:
            self._import_group(transaction_group)

        print "%6.2fs | Finished %d lines. Imported: %d; Not-valid: %d; Errors: %d" % (
        time() - start, self.line, self.imported, self.not_valid, self.errors)
