from django.db import models
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from django.contrib.auth.models import User
from random import shuffle
from msgvis.apps.coding import utils as coding_utils
from msgvis.apps.base.utils import check_or_create_dir


class CodeAssignment(models.Model):
    """
    A model for recording code assignment
    """
    user = models.ForeignKey(User, related_name="code_assignments")
    message = models.ForeignKey(corpus_models.Message, related_name="code_assignments")
    code = models.ForeignKey(corpus_models.Code, related_name="code_assignments")

    is_user_labeled = models.BooleanField(default=True)
    """Whether this code assignment is user given. Otherwise it is from the user's model"""
    probability = models.FloatField(default=1.0)
    """How confident the code is; It will be 1.0 if this is user labeled"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    valid = models.BooleanField(default=True)
    """ Whether this code is valid (False indicate the code to the message has been removed) """

class FeatureAssignment(models.Model):
    """
    A model for recording feature assignment
    """
    user = models.ForeignKey(User, related_name="feature_assignments")
    feature = models.ForeignKey(enhance_models.Feature, related_name="feature_assignments")

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    valid = models.BooleanField(default=True)
    """ Whether this code is valid (False indicate the code to the message has been removed) """

class SVMModel(models.Model):
    """
    A model for svm model
    """
    user = models.ForeignKey(User, related_name="svm_models", unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    saved_path = models.FilePathField(default=None, blank=True, null=True)
    """scikit-learn model will be saved in the given path"""


class SVMModelWeight(models.Model):
    """
    A model for svm model weight
    """
    svm_model = models.ForeignKey(SVMModel, related_name="weights")
    code = models.ForeignKey(corpus_models.Code, related_name="weights")
    feature = models.ForeignKey(enhance_models.Feature, related_name="weights")
    weight = models.FloatField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""