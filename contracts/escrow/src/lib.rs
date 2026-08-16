#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, Env, Symbol, Vec};

#[derive(Clone)]
#[contracttype]
pub struct Record {
    pub kind: Symbol,      // "deposit" or "release"
    pub party: Address,
    pub amount: i128,
    pub campaign_id: Symbol,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Verifier,
    Recipients,             // Vec<Address> whitelist
    Ledger(Symbol),         // campaign_id -> Vec<Record>
    Balance,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, verifier: Address) {
        env.storage().instance().set(&DataKey::Verifier, &verifier);
        let empty_recipients: Vec<Address> = vec![&env];
        env.storage().instance().set(&DataKey::Recipients, &empty_recipients);
    }

    pub fn add_verified_recipient(env: Env, verifier: Address, recipient: Address) {
        verifier.require_auth();
        let stored_verifier: Address = env.storage().instance().get(&DataKey::Verifier).unwrap();
        assert_eq!(verifier, stored_verifier, "not authorized verifier");

        let mut recipients: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Recipients)
            .unwrap_or(vec![&env]);
        recipients.push_back(recipient);
        env.storage().instance().set(&DataKey::Recipients, &recipients);
    }

    pub fn deposit(env: Env, donor: Address, amount: i128, campaign_id: Symbol) {
        donor.require_auth();
        assert!(amount > 0, "amount must be positive");

        // NOTE: for the demo, wire this to a token contract's transfer()
        // to move `amount` from donor -> this contract's address.
        // token_client.transfer(&donor, &env.current_contract_address(), &amount);

        let record = Record {
            kind: symbol_short!("deposit"),
            party: donor,
            amount,
            campaign_id: campaign_id.clone(),
            timestamp: env.ledger().timestamp(),
        };
        Self::push_ledger(&env, campaign_id, record);
    }

    pub fn release(env: Env, verifier: Address, recipient: Address, amount: i128, campaign_id: Symbol) {
        verifier.require_auth();
        let stored_verifier: Address = env.storage().instance().get(&DataKey::Verifier).unwrap();
        assert_eq!(verifier, stored_verifier, "not authorized verifier");

        let recipients: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Recipients)
            .unwrap_or(vec![&env]);
        assert!(recipients.contains(&recipient), "recipient not verified");

        // NOTE: for the demo, wire this to a token contract's transfer()
        // to move `amount` from this contract's address -> recipient.
        // token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        let record = Record {
            kind: symbol_short!("release"),
            party: recipient,
            amount,
            campaign_id: campaign_id.clone(),
            timestamp: env.ledger().timestamp(),
        };
        Self::push_ledger(&env, campaign_id, record);
    }

    pub fn get_ledger(env: Env, campaign_id: Symbol) -> Vec<Record> {
        env.storage()
            .instance()
            .get(&DataKey::Ledger(campaign_id))
            .unwrap_or(vec![&env])
    }

    fn push_ledger(env: &Env, campaign_id: Symbol, record: Record) {
        let mut ledger: Vec<Record> = env
            .storage()
            .instance()
            .get(&DataKey::Ledger(campaign_id.clone()))
            .unwrap_or(vec![env]);
        ledger.push_back(record);
        env.storage().instance().set(&DataKey::Ledger(campaign_id), &ledger);
    }
}

