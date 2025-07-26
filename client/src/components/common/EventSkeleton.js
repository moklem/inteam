import React from 'react';
import PropTypes from 'prop-types';
import { 
  Card, 
  CardContent, 
  Skeleton, 
  Box, 
  Grid 
} from '@mui/material';

const EventSkeleton = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} md={6} lg={4} key={index}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="60%" height={28} />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="80%" height={20} />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="70%" height={20} />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="50%" height={20} />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={80} height={36} />
                <Skeleton variant="rounded" width={80} height={36} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </>
  );
};

EventSkeleton.propTypes = {
  count: PropTypes.number
};

export default EventSkeleton;