#!/usr/bin/perl
use strict;
use warnings;
use File::Basename qw(dirname basename);
use File::Path qw(make_path);

# Creates intl file from property files in ../chrome/content/locale/
#
# https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#Internationalizing_manifest.json

my $json = <<'EOS';
{
    "description": {
        "message": "%s"
    }
}
EOS

main() if __FILE__ eq $0;

sub main {
    my $dir = dirname __FILE__;
    my $propfiles = "$dir/../chrome/locale/*/*/*.properties";

    for my $prop (glob $propfiles) {
        my $lang = basename dirname dirname $prop;
        $lang =~ tr/-/_/;
        my $out = "$dir/$lang/messages.json";
        my $desc = load_desc($prop);

        make_path dirname $out;
        write_json($out, $desc);

        print "$out\n";
    }
}

sub write_json {
    my ($destpath, $desc) = @_;

    open my $f, '>utf8', $destpath;
    printf $f $json, $desc;
}

sub load_desc {
    my ($propfile) = @_;

    open my $f, '<utf8', $propfile;
    while (readline $f) {
        if (/description\s*=\s*([^\r\n]*)/) {
            return $1;
        }
    }
    die "No description found in $propfile";
}
