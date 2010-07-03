SHELL = bash

all:
	@ver=$$(grep "<version>" install.rdf | perl -p -e 's/[^\d]//g') ;\
    name=$$(basename $$(pwd)) ; \
    cd chrome ; rm -f $${name}.jar; zip -r $${name}.jar content locale -x '*/.svn/*' > /dev/null; \
    cd .. ; rm -f $${name}_v$$ver.xpi; zip -r $${name}_v$$ver.xpi  chrome/*.jar install.rdf chrome.manifest makefile defaults -x '*/.svn/*' > /dev/null; \
    echo "$${name}_v$$ver.xpi Done."
