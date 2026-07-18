import inject

from infra.config import Settings


def configure_dependencies(settings: Settings) -> None:
    def config(binder: inject.Binder) -> None:
        binder.bind(Settings, settings)

    inject.clear_and_configure(config)
