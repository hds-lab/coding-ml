class StoriesRouter(object):
    """
    A router to control all database operations on models in the
    stories application.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read stories models go to fanfiction.
        """
        if model._meta.app_label == 'stories':
            return 'fanfiction'
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write stories models go to fanfiction.
        """
        if model._meta.app_label == 'stories':
            return 'fanfiction'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the stories app is involved.
        """
        if obj1._meta.app_label == 'stories' or \
           obj2._meta.app_label == 'stories':
           return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the stories app only appears in the 'fanfiction'
        database.
        """
        if app_label == 'stories':
            return db == 'fanfiction'
        return None