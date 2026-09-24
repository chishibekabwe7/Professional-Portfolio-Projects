#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys 

#Sunday 20th September 2026 11:59:59 PM
#Tuesday 22nd September 2026 11:15:32 PM

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pact.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
