import numpy
from sklearn import svm
from sklearn.externals import joblib
from django.db.models import Q
from operator import or_
from msgvis.apps.coding.models import Comment


def get_formatted_X(dictionary, source, messages, feature_index_map, feature_num, use_tfidf=False, master_messages=[]):

    message_num = len(messages) + len(master_messages)

    source_list = ["system", source]
    filter_ors = []
    for source in source_list:
        if source == "system":
            filter_ors.append(("feature__source__isnull", True))
        else:
            filter_ors.append(("feature__source", source))

    X = numpy.zeros((message_num, feature_num), dtype=numpy.float64)

    for idx, msg in enumerate(messages):
        message_feature_scores = msg.feature_scores.filter(feature__dictionary=dictionary, feature__valid=True)
        message_feature_scores = message_feature_scores.filter(reduce(or_, [Q(x) for x in filter_ors])).all()
        for feature_score in message_feature_scores:
            index = feature_index_map[feature_score.feature_index]
            X[idx, index] = feature_score.tfidf if use_tfidf else feature_score.count

    if len(master_messages) > 0:
        for idx, msg in enumerate(master_messages):
            message_feature_scores = msg.feature_scores.filter(feature__dictionary=dictionary, feature__valid=True)
            message_feature_scores = message_feature_scores.filter(reduce(or_, [Q(x) for x in filter_ors])).all()
            for feature_score in message_feature_scores:
                index = feature_index_map[feature_score.feature_index]
                X[idx, index] = feature_score.tfidf if use_tfidf else feature_score.count

    return X

def get_formatted_y(source, messages, master_messages=[]):

    code_num = 0
    code_map = {}
    code_map_inverse = {}


    y = []
    for idx, msg in enumerate(messages):
        code_id = msg.code_assignments.filter(source=source,
                                              valid=True,
                                              is_user_labeled=True).order_by("-last_updated").first().code.id
        code_index = code_map.get(code_id)
        if code_index is None:
            code_index = code_num
            code_map[code_id] = code_index
            code_map_inverse[code_index] = code_id
            code_num += 1

        y.append(code_index)

    if len(master_messages) > 0:
        for idx, msg in enumerate(master_messages):
            code_id = msg.code_assignments.filter(source__username="master",
                                                  valid=True,
                                                  is_user_labeled=True).order_by("-last_updated").first().code.id
            code_index = code_map.get(code_id)
            if code_index is None:
                code_index = code_num
                code_map[code_id] = code_index
                code_map_inverse[code_index] = code_id
                code_num += 1

            y.append(code_index)

    return y, code_map_inverse

def get_formatted_data(dictionary, source, messages, feature_index_map, feature_num, use_tfidf=False, master_messages=[]):
    X = get_formatted_X(dictionary, source, messages, feature_index_map, feature_num, use_tfidf, master_messages)
    y, code_map_inverse = get_formatted_y(source, messages, master_messages)

    return X, y, code_map_inverse


def train_model(X, y, model_save_path=None):
    lin_clf = svm.LinearSVC()
    lin_clf.fit(X, y)

    if model_save_path:
        joblib.dump(lin_clf, model_save_path + "/model.pkl")

    return lin_clf


def get_prediction(lin_model, X):
    prediction = lin_model.predict(X)

    if hasattr(lin_model, "predict_proba"):
        prob = lin_model.predict_proba(X)[:, 1]
    else:  # use decision function
        prob = lin_model.decision_function(X)
        min = prob.min()
        max = prob.max()
        prob = \
            (prob - min) / (max - min)

    return prediction, prob


def get_last_comment_index(message_id):
    comments = Comment.objects.filter(message_id=message_id).order_by('-index')
    if comments.count() > 0:
        last_comment = Comment.objects.filter(message_id=message_id).order_by('-index').first()
        return last_comment.index
    else:
        return -1


def add_comment(message_id, text, source):
    index = get_last_comment_index(message_id) + 1
    comment = Comment(index=index,
                      message=message_id,
                      source=source,
                      text=text)
    comment.save()
    return comment

