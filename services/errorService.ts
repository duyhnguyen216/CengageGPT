import { useMemo } from 'react';

import { useTranslation } from 'next-i18next';

import { ErrorMessage } from '@/types/error';

const useErrorService = () => {
  const { t } = useTranslation('chat');

  return {
    getModelsError: useMemo(
      () => (error: any) => {
        return !error
          ? null
          : ({
              title: t('Error fetching models.'),
              code: error.status || 'unknown',
              messageLines: error.statusText
                ? [error.statusText]
                : [
                    t(
                      'Make sure you are connected the the Internet and is authenticated through Cengage services.',
                    ),
                    t(
                      'If you completed these steps, CengageGPT may be experiencing issues. Please contact system admin',
                    ),
                  ],
            } as ErrorMessage);
      },
      [t],
    ),
  };
};

export default useErrorService;
