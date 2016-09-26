from datetime import datetime
from math import log
from operator import attrgetter
import os

from django.core.management.base import BaseCommand, make_option, CommandError
from django.db import connection
from django.db.models import Q, Count


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

def get_time_span_in_seconds(start_time, end_time):
    timediff = end_time - start_time
    return timediff.total_seconds()

# fields for grouping
unit_fields = ["year", "month", "day", "hour"]
unit_list_range = dict((("YEARLY", 1), ("MONTHLY", 2), ("DAILY", 3), ("HOURLY", 4)))

def get_best_time_bucket(timediff_in_seconds):
    if timediff_in_seconds <= 86400 * 5:
        return "HOURLY"
    elif timediff_in_seconds <= 86400 * 30:
        return "DAILY"
    elif timediff_in_seconds <= 86400 * 30 * 12 * 3:
        return "MONTHLY"
    else:
        return "YEARLY"


def group_messages_by_time(queryset, field_name, start_time, end_time):

    #queryset = queryset.filter(Q(field_name + "__isnull", False))
    # queryset = queryset.annotate(
    #     year=ExtractYear(field_name),
    #     month=ExtractMonth(field_name),
    #     day=ExtractDay(field_name),
    #     hour=ExtractHour(field_name)
    # )
    timediff = get_time_span_in_seconds(start_time, end_time)
    unit = get_best_time_bucket(timediff)

    truncate = dict((('year', connection.ops.date_trunc_sql('year', field_name)),
                ('month',connection.ops.date_trunc_sql('month', field_name)),
                ('day', connection.ops.date_trunc_sql('day', field_name)),
                ('hour', connection.ops.date_trunc_sql('hour', field_name))))
    queryset = queryset.extra(truncate)

    grouping_fields = unit_fields[:unit_list_range[unit]]
    results = queryset.values(*grouping_fields).annotate(count=Count('id')).order_by(*grouping_fields)
    default_datetime = datetime(2016, 1, 1)
    for idx, result in enumerate(results):
        obj_time_fields = {}
        for field in grouping_fields:
            field_obj = result[field]
            obj_time_fields[field] = attrgetter(field)(field_obj)
        results[idx]['time'] = default_datetime.replace(**obj_time_fields)
    return results

