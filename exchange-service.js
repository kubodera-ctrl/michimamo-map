(function (root) {
    'use strict';

    const BETA_MESSAGE = '現在はβ版のため、ポイント交換の受付を行っていません。\n正式サービス開始後にご利用いただけます。';

    class DigitalGiftProvider {
        constructor() {
            this.id = 'digital_gift';
            this.displayName = 'デジタルギフト';
        }
        async issue() {
            throw new Error('digital_gift_api_not_connected');
        }
    }

    class ExchangeService {
        constructor(getClient) {
            this.getClient = getClient;
            this.providers = new Map([['digital_gift', new DigitalGiftProvider()]]);
        }
        client() {
            const client = this.getClient();
            if (!client) throw new Error('exchange_client_unavailable');
            return client;
        }
        async getCatalog() {
            const { data, error } = await this.client().rpc('get_point_exchange_catalog');
            if (error) throw error;
            return data || { beta: true, enabled: false, options: [], providers: [] };
        }
        async getMyHistory() {
            const { data, error } = await this.client().rpc('get_my_point_exchange_history');
            if (error) throw error;
            return Array.isArray(data) ? data : [];
        }
        async request(optionId, idempotencyKey, guardianConfirmation) {
            const { data, error } = await this.client().rpc('request_point_exchange', {
                p_option_id: optionId,
                p_idempotency_key: idempotencyKey,
                p_guardian_confirmation: guardianConfirmation || null
            });
            if (error) throw error;
            return data;
        }
        async getAdminRequests(password, status) {
            const { data, error } = await this.client().rpc('admin_list_point_exchanges', {
                p_password: password,
                p_status: status || null
            });
            if (error) throw error;
            return Array.isArray(data) ? data : [];
        }
        async adminAction() {
            throw new Error('exchange_beta_closed');
        }
    }

    root.MachimamoExchange = Object.freeze({
        BETA_MESSAGE,
        DigitalGiftProvider,
        ExchangeService,
        service: new ExchangeService(() => root.db)
    });
})(window);
