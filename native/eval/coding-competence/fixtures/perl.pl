# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
package Shape;
use strict;
use warnings;
use parent 'Base';
use List::Util qw(sum);

sub new {
    my ($class, %args) = @_;
    return bless { r => $args{r} }, $class;
}

sub area {
    my $self = shift;
    return 3.14159 * $self->{r} ** 2;
}

package main;

sub describe { my $s = shift; return "area=" . $s->area(); }

my $c = Shape->new(r => 2.0);
print describe($c), "\n";
