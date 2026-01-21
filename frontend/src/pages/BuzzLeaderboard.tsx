import { useGetBuzzLeaderboard } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, Trophy, Medal, Award } from 'lucide-react';

export default function BuzzLeaderboard() {
  const { data: leaderboard, isLoading, error } = useGetBuzzLeaderboard();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading BUZZ leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              BUZZ Leaderboard
            </CardTitle>
            <CardDescription>Error loading leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load leaderboard data'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            BUZZ Leaderboard
          </CardTitle>
          <CardDescription>
            Top contributors ranked by BUZZ points earned through creating and receiving votes on Law Tokens and Interpretation Tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!leaderboard || leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No BUZZ scores yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start creating Law Tokens and Interpretation Tokens to earn BUZZ points!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Principal ID</TableHead>
                    <TableHead className="text-right">BUZZ Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const score = Number(entry.score);
                    const isTopThree = rank <= 3;
                    
                    return (
                      <TableRow 
                        key={entry.principal.toString()} 
                        className={isTopThree ? 'bg-muted/50' : ''}
                      >
                        <TableCell className="text-center font-medium">
                          <div className="flex items-center justify-center gap-2">
                            {getRankIcon(rank)}
                            <span>{rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.profileName || (
                            <span className="text-muted-foreground italic">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry.principal.toString().slice(0, 20)}...
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={score >= 0 ? 'default' : 'destructive'}
                            className="font-mono"
                          >
                            <Zap className="mr-1 h-3 w-3" />
                            {score}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-semibold">How BUZZ Points Work:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Create a Law Token: <span className="font-medium text-foreground">+3 BUZZ</span></li>
              <li>• Create an Interpretation Token: <span className="font-medium text-foreground">+5 BUZZ</span></li>
              <li>• Your Law Token receives an upvote: <span className="font-medium text-foreground">+1 BUZZ</span></li>
              <li>• Your Interpretation Token receives an upvote: <span className="font-medium text-foreground">+2 BUZZ</span></li>
              <li>• Your Law Token receives a downvote: <span className="font-medium text-destructive">-1 BUZZ</span></li>
              <li>• Your Interpretation Token receives a downvote: <span className="font-medium text-destructive">-2 BUZZ</span></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
