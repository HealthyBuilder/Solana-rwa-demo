use anchor_lang::prelude::*;

#[cfg(test)]
mod tests;

declare_id!("B6HTnuN4RgoEnsxWFm74TVXdHEQb7fSjguzovQQjZseY");

const TOTAL_LABUBU_TYPES: usize = 12;
const NORMAL_SUPPLY: u16 = 120;
const RARE_SUPPLY: u16 = 1;

#[program]
pub mod vault {
    use super::*;

    /// 初始化 Labubu Collection
    /// 11种普通款每种120个，1种隐藏款1个
    pub fn initialize_collection(ctx: Context<InitializeCollection>) -> Result<()> {
        let collection = &mut ctx.accounts.collection;

        // 初始化库存：前11种每种120个，第12种1个
        for i in 0..TOTAL_LABUBU_TYPES {
            collection.remaining_supply[i] = if i < 11 { NORMAL_SUPPLY } else { RARE_SUPPLY };
        }

        collection.total_minted = 0;
        collection.authority = ctx.accounts.authority.key();

        Ok(())
    }

    /// 抽取一个随机的 Labubu
    pub fn mint_random(ctx: Context<MintRandom>) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        let user_labubu = &mut ctx.accounts.user_labubu;

        // 检查用户是否已经抽过
        require!(
            user_labubu.labubu_id == 0,
            LabubuError::AlreadyMinted
        );

        // 计算剩余总数
        let total_remaining: u16 = collection.remaining_supply.iter().sum();
        require!(total_remaining > 0, LabubuError::SoldOut);

        // 使用 Clock 生成伪随机数
        let clock = Clock::get()?;
        let random_seed = clock.unix_timestamp as u64 ^ clock.slot;
        let random_index = (random_seed % total_remaining as u64) as u16;

        // 找到对应的 Labubu ID
        let mut cumulative = 0u16;
        let mut selected_id = 0u8;

        for (i, &supply) in collection.remaining_supply.iter().enumerate() {
            cumulative += supply;
            if random_index < cumulative {
                selected_id = (i + 1) as u8; // ID 从 1 开始
                collection.remaining_supply[i] -= 1;
                break;
            }
        }

        // 记录用户抽中的 Labubu
        user_labubu.owner = ctx.accounts.user.key();
        user_labubu.labubu_id = selected_id;
        user_labubu.minted_at = clock.unix_timestamp;

        collection.total_minted += 1;

        msg!("Minted Labubu #{} for user {}", selected_id, ctx.accounts.user.key());

        Ok(())
    }
}

/// Collection 账户，存储所有 Labubu 的库存信息
#[account]
pub struct LabubuCollection {
    pub authority: Pubkey,                      // 8 + 32
    pub remaining_supply: [u16; TOTAL_LABUBU_TYPES], // 12 * 2 = 24
    pub total_minted: u32,                      // 4
} // Total: 68 bytes

/// 用户的 Labubu NFT 记录
#[account]
pub struct UserLabubu {
    pub owner: Pubkey,      // 32
    pub labubu_id: u8,      // 1 (1-12)
    pub minted_at: i64,     // 8
} // Total: 41 bytes

#[derive(Accounts)]
pub struct InitializeCollection<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + 68,
        seeds = [b"collection"],
        bump
    )]
    pub collection: Account<'info, LabubuCollection>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintRandom<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"collection"],
        bump
    )]
    pub collection: Account<'info, LabubuCollection>,

    #[account(
        init,
        payer = user,
        space = 8 + 41,
        seeds = [b"user_labubu", user.key().as_ref()],
        bump
    )]
    pub user_labubu: Account<'info, UserLabubu>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum LabubuError {
    #[msg("Already minted a Labubu")]
    AlreadyMinted,
    #[msg("All Labubu sold out")]
    SoldOut,
}
