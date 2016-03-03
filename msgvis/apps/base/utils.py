from django.core.management.base import BaseCommand, make_option, CommandError
import os
from math import log

def _mkdir_recursive( path):
    sub_path = os.path.dirname(path)
    if not os.path.exists(sub_path):
        _mkdir_recursive(sub_path)
    if not os.path.exists(path):
        os.mkdir(path)

def check_or_create_dir(dir_path):
    if os.path.exists(dir_path):
            if not os.path.isdir(dir_path):
                raise CommandError("The given path is not a folder.")
    else:
        try:
            _mkdir_recursive(dir_path)
        except OSError:
            raise CommandError("Weird path error happens.")


def entropy(items):

    eps = 0.00001
    total_sum = 0.0
    H = 0
    for key, value in items.iteritems():
        total_sum += float(value + eps)

    for key, value in items.iteritems():
        p = float(value + eps) / total_sum
        try:
            H += -(p * log(p, 2))
        except:
            import pdb
            pdb.set_trace()

    return H


class AttributeDict(dict):
    __getattr__ = dict.__getitem__
    __setattr__ = dict.__setitem__


_stoplist = None

def get_stoplist():
    global _stoplist
    if not _stoplist:
        from nltk.corpus import stopwords

        _stoplist = stopwords.words('english')
    return _stoplist