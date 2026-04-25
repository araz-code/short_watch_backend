from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from errors.models import Error
from errors.service import delete_old_errors


class DeleteOldErrorsTests(TestCase):
    def _make_error(self, message, age_days):
        err = Error.objects.create(message=message)
        # auto_now_add can't be overridden at create time; backdate via update.
        Error.objects.filter(pk=err.pk).update(
            date=timezone.now() - timedelta(days=age_days)
        )
        return err

    def test_deletes_rows_older_than_10_days(self):
        old = self._make_error('old', age_days=11)
        ancient = self._make_error('ancient', age_days=200)
        recent = self._make_error('recent', age_days=1)
        edge = self._make_error('edge', age_days=9)

        delete_old_errors()

        self.assertFalse(Error.objects.filter(pk=old.pk).exists())
        self.assertFalse(Error.objects.filter(pk=ancient.pk).exists())
        self.assertTrue(Error.objects.filter(pk=recent.pk).exists())
        self.assertTrue(Error.objects.filter(pk=edge.pk).exists())

    def test_no_op_when_all_rows_recent(self):
        for i in range(5):
            self._make_error(f'recent {i}', age_days=1)

        delete_old_errors()

        self.assertEqual(Error.objects.count(), 5)
