from django.core.management.base import BaseCommand, make_option, CommandError
import os
from math import log

def check_or_create_dir(dir_path):
    if os.path.exists(dir_path):
            if not os.path.isdir(dir_path):
                raise CommandError("The given path is not a folder.")
    else:
        try:
            os.mkdir(dir_path)
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