from django.db import models
from django.contrib.auth.models import User

from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from msgvis.apps.base import models as base_models



class CodeAssignment(models.Model):
    """
    A model for recording code assignment
    """
    source = models.ForeignKey(User, related_name="code_assignments")
    message = models.ForeignKey(corpus_models.Message, related_name="code_assignments")
    code = models.ForeignKey(enhance_models.Code, related_name="code_assignments")

    is_saved = models.BooleanField(default=False)
    is_ambiguous = models.BooleanField(default=False)
    is_example = models.BooleanField(default=False)

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

    def partner_assignment(self):
        partner = self.source.pair.first().get_partner(self.source)
        return partner.code_assignments.filter(valid=True, is_user_labeled=True,
                                               message=self.message).first()

    @property
    def partner_code(self):
        partner_assignment = self.partner_assignment()

        if partner_assignment:
            return partner_assignment.code
        else:
            return None

    @property
    def disagreement_indicator(self):
        partner_assignment = self.partner_assignment()
        indicator =  self.user_disagreement_indicators.filter(partner_assignment=partner_assignment, valid=True).first()
        if indicator is None and self.code != partner_assignment.code:
            indicator = DisagreementIndicator(message=self.message, user_assignment=self,
                                              partner_assignment=partner_assignment)
            indicator.save()
        return indicator



class CodeDefinition(models.Model):
    """
    A model for code definition
    """
    code = models.ForeignKey(enhance_models.Code, related_name="definitions")
    source = models.ForeignKey(User, related_name="definitions")
    text = models.TextField(null=True, blank=True, default="")

    @property
    def examples(self):
        return map(lambda x: x.message, CodeAssignment.objects.filter(valid=True, is_example=True, source=self.source, code=self.code)[:10])


    valid = models.BooleanField(default=True)
    """ Whether this code definition is valid (False indicate the code to the message has been removed) """
    created_at = models.DateTimeField(auto_now_add=True, default=None)
    """The code definition created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True, default=None)
    """The code definition updated time"""

    def __repr__(self):
        return "%s | %s | %s" % (self.code.text, self.source.username, self.text)

    def __unicode__(self):
        return self.__repr__()


class DisagreementIndicator(models.Model):
    """
    A model for indicating the type of disagreement
    """
    message = models.ForeignKey(corpus_models.Message, related_name="disagreement_indicators")
    user_assignment = models.ForeignKey(CodeAssignment, related_name="user_disagreement_indicators")
    partner_assignment = models.ForeignKey(CodeAssignment, related_name="partner_disagreement_indicators")
    TYPE_CHOICES = (
        ('N', 'Not specified'),
        ('U', 'My code is correct'),
        ('D', 'My partner and I disagree'),
        ('P', 'My partner\'s code is correct'),
    )
    type = models.CharField(max_length=1, choices=TYPE_CHOICES, default='N')

    valid = models.BooleanField(default=True)
    """ Whether this disagreement indicator is valide """
    created_at = models.DateTimeField(auto_now_add=True, default=None)
    """The disagreement indicator created time"""

    def __repr__(self):
        return "Message: %s\nCode: %s vs %s | Type: %s" % (self.message.text,
                                                           self.user_assignment.code.text,
                                                           self.partner_assignment.code.text,
                                                           self.type)

    def __unicode__(self):
        return self.__repr__()