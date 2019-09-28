SHELL = bash

all:
	@test -z "$(BUMPED_VERSION)" || perl -i -pe 's/("version":\s*")[^"]+/$${1}$(BUMPED_VERSION)/' manifest.json ;\
	ver=$$(perl -ne 'if (/"version":\s*"([^"]+)/) { local $$_ = $$1; tr/.//d; print }' manifest.json) ;\
    name=$$(basename $$(pwd)) ; \
    rm -f $${name}_v$$ver.xpi; \
    zip -r $${name}_v$$ver.xpi chrome _locales chrome.manifest makefile defaults manifest.json -x makefile -x '**/*.pl' -x '*/.svn/*' > /dev/null; \
    echo "$${name}_v$$ver.xpi Done."
