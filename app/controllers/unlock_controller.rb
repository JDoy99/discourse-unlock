# frozen_string_literal: true

class UnlockController < ApplicationController
  def unlock
    lock = params.require(:lock)
    wallet = params[:wallet]
    transaction = params[:transaction]

    return unless current_user
    return unless settings = ::Unlock.settings
    return if settings["lock_address"].blank? || settings["lock_address"] != lock.downcase
    return unless group = Group.find_by(name: settings["unlocked_group_name"])

    user = User.find_by(id: current_user.id)
    user.lock_timestamp = Time.now
    user.save

    if group.users.find_by(id: current_user.id)
    else
      group.users << current_user
    end

    value = { lock: lock }
    value[:wallet] = wallet if wallet.present?
    value[:transaction] = transaction if transaction.present?

    PluginStore.set(::Unlock::PLUGIN_NAME, "#{::Unlock::TRANSACTION}_#{current_user.id}", value)

    render json: success_json
  end

  def unlock_premium
    lock = params.require(:lock)
    wallet = params[:wallet]
    transaction = params[:transaction]

    return unless current_user
    return unless settings = ::Unlock.settings
    return if settings["lock_address"].blank? || settings["lock_address"] != lock.downcase
    return unless group = Group.find_by(name: settings["unlocked_group_name"])

    user = User.find_by(id: current_user.id)
    user.lock_timestamp = Time.now
    user.save
    
    if group.users.find_by(id: current_user.id)
    else
      group.users << current_user
    end

    group = Group.find_by(name: "rfp-author")
    if group.users.find_by(id: current_user.id) 
    else
      group.users << current_user
    end

    value = { lock: lock }
    value[:wallet] = wallet if wallet.present?
    value[:transaction] = transaction if transaction.present?

    PluginStore.set(::Unlock::PLUGIN_NAME, "#{::Unlock::TRANSACTION}_#{current_user.id}", value)

    render json: success_json
  end
end
